import {
    FulfillmentStatus,
    OrderStatus,
    PaymentStatus,
    type SubscriberArgs,
    type SubscriberConfig,
} from '@medusajs/medusa'
import type OrderRepository from '@medusajs/medusa/dist/repositories/order'

import type { Order } from '../../models/order'
import OrderService from '../../services/order'


export default async function handleOrderUpdated({
    data,
    eventName,
    container,
    pluginOptions,
}: SubscriberArgs<Record<string, string>>) {
    const orderService = container.resolve<OrderService>('orderService')
    const orderRepo = container.resolve<typeof OrderRepository>('orderRepository')

    const order = await orderService.retrieve(data.id)

    if (!order.order_parent_id) {
        return
    }

    const parentOrder = await orderService.retrieve(order.order_parent_id, {
        relations: ['children'],
    })

    const status = await getStatusFromChildren(parentOrder)

    if (status !== parentOrder.status) {
        switch (status) {
            case OrderStatus.CANCELED:
                await orderService.cancel(parentOrder.id)
            case OrderStatus.ARCHIVED:
                await orderService.archive(parentOrder.id)
            case OrderStatus.COMPLETED:
                await orderService.completeOrder(parentOrder.id)
            default:
                parentOrder.status = status
                parentOrder.fulfillment_status = (status === 'completed'
                    ? FulfillmentStatus.SHIPPED
                    : status) as unknown as FulfillmentStatus
                parentOrder.payment_status = (status === 'completed') ? PaymentStatus.CAPTURED : status as unknown as PaymentStatus
                await orderRepo.save(parentOrder)
        }
    }
}

async function getStatusFromChildren(order: Order) {
    if (!order.children) {
        return order.status
    }

    let statuses = order.children.map((child) => child.status)
    //remove duplicate statuses
    statuses = [...new Set(statuses)]

    if (statuses.length === 1) {
        return statuses[0]
    }

    statuses = statuses.filter((status) => status !== OrderStatus.CANCELED && status !== OrderStatus.ARCHIVED)

    if (!statuses.length) {
        //all child orders are archived or canceled
        return OrderStatus.CANCELED
    }

    if (statuses.length === 1) {
        return statuses[0]
    }

    //check if any order requires action
    const hasRequiresAction = statuses.some((status) => status === OrderStatus.REQUIRES_ACTION)

    if (hasRequiresAction) {
        return OrderStatus.REQUIRES_ACTION
    }

    //since more than one status is left and we filtered out canceled, archived,
    //and requires action statuses, only pending and complete left. So, return pending
    return OrderStatus.PENDING
}

export const config: SubscriberConfig = {
    event: [
        OrderService.Events.UPDATED,
        // OrderService.Events.COMPLETED,
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
        subscriberId: 'order-updated-handler',
    },
}