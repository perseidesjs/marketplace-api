import {
    FulfillmentStatus,
    Logger,
    MedusaContainer,
    OrderStatus,
    PaymentStatus,
    type SubscriberArgs,
    type SubscriberConfig,
} from '@medusajs/medusa'

import type { Order } from '../../models/order'
import OrderService from '../../services/order'
import StripeConnectService from 'src/services/stripe-connect'

export default async function handleOrderUpdated({
    data,
    eventName,
    container,
    pluginOptions,
}: SubscriberArgs<Record<string, string>>) {
    const logger = container.resolve<Logger>('logger')

    const orderService: OrderService = container.resolve('orderService')

    const order = await orderService.retrieve(data.id)

    if (!order.order_parent_id) {
        return
    }

    const updateActivity = logger.activity(`Updating child order statuses for the parent order ${order.order_parent_id}...`)
    await updateStatusOfChildren({
        container,
        parentOrderId: order.order_parent_id,
        updateActivity,
        logger
    })
    logger.success(updateActivity, `Child order statuses updated for the parent order ${order.order_parent_id}.`)
}

/**
 * This function is executed when a child order is updated.
 * It checks if the child order has a payment status of "captured" and a fulfillment status of "shipped".
 * If both conditions are met, it updates the child order's status to "complete", allowing a parent order to be marked as "complete" too.
 * But we also create a Stripe transfer for the store.
 */
type Options = {
    container: MedusaContainer,
    parentOrderId: string,
    updateActivity: void,
    logger: Logger
}
async function updateStatusOfChildren({
    container,
    parentOrderId,
    logger,
    updateActivity
}: Options) {

    const orderService = container.resolve<OrderService>('orderService')
    const stripeConnectService = container.resolve<StripeConnectService>('stripeConnectService')

    const parentOrder = await orderService.retrieve(parentOrderId, {
        relations: ['children'],
    })

    if (!parentOrder.children) {
        return
    }

    const ordersToComplete = parentOrder.children
        .filter((child) => child.payment_status === PaymentStatus.CAPTURED || child.payment_status === PaymentStatus.PARTIALLY_REFUNDED || child.payment_status === PaymentStatus.REFUNDED)
        .filter((child) => child.fulfillment_status === FulfillmentStatus.SHIPPED)
        .filter(
            (child) =>
                child.status !== OrderStatus.CANCELED &&
                child.status !== OrderStatus.ARCHIVED &&
                child.status !== OrderStatus.COMPLETED,
        )

    if (ordersToComplete.length === 0) {
        return
    }

    for (const order of ordersToComplete) {
        await orderService.completeOrder(order.id)

        const childOrder = await orderService.retrieveWithTotals(order.id, {
            relations: ['store']
        })


        await stripeConnectService.createTransfer({
            amount: childOrder.total - childOrder.refunded_total,
            currency: childOrder.currency_code,
            destination: childOrder.store.stripe_account_id,
            metadata: {
                orderId: childOrder.id,
                orderNumber: childOrder.display_id,
            },
        }).catch((e) => {
            logger.failure(updateActivity, `An error has occured while creating the Stripe transfer for order ${order.id}.`)
            throw e
        })
    }
}

export const config: SubscriberConfig = {
    event: [
        OrderService.Events.UPDATED,
        OrderService.Events.FULFILLMENT_CREATED,
        OrderService.Events.FULFILLMENT_CANCELED,
        OrderService.Events.GIFT_CARD_CREATED,
        OrderService.Events.ITEMS_RETURNED,
        OrderService.Events.PAYMENT_CAPTURED,
        OrderService.Events.PAYMENT_CAPTURE_FAILED,
        OrderService.Events.REFUND_CREATED,
        OrderService.Events.REFUND_FAILED,
        OrderService.Events.RETURN_ACTION_REQUIRED,
        OrderService.Events.RETURN_REQUESTED,
        OrderService.Events.SHIPMENT_CREATED,
        OrderService.Events.SWAP_CREATED,
    ],
    context: {
        subscriberId: 'child-order-updated-handler',
    },
}
