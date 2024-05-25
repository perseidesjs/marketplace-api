import {
    FulfillmentStatus,
    Logger,
    OrderStatus,
    PaymentStatus,
    type SubscriberArgs,
    type SubscriberConfig,
} from '@medusajs/medusa'

import type { Order } from '../../models/order'
import OrderService from '../../services/order'

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
    const parentOrder = await orderService.retrieve(order.order_parent_id, {
        relations: ['children'],
    }).catch((e) => {
        logger.error(updateActivity, `Error retrieving parent order ${order.order_parent_id}: ${e.message}`)
        throw e
    })

    await updateStatusOfChildren(parentOrder, orderService)
    logger.success(updateActivity, `Child order statuses updated for the parent order ${order.order_parent_id}.`)
}

/**
 * This function is executed when a child order is updated.
 * It checks if the child order has a payment status of "captured" and a fulfillment status of "shipped".
 * If both conditions are met, it updates the child order's status to "complete", allowing a parent order to be marked as "complete" too.
 */
async function updateStatusOfChildren(order: Order, orderService: OrderService) {
    if (!order.children) {
        return
    }

    const ordersToComplete = order.children
        .filter((child) => child.payment_status === PaymentStatus.CAPTURED)
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
