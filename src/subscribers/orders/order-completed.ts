// src/subscribers/orders/order-completed.ts

import type { EventBusService, SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'


import OrderService from '../../services/order'
import type StripeConnectService from '../../services/stripe-connect'

export default async function handleOrderCompleted({
    data,
    eventName,
    container,
    pluginOptions,
}: SubscriberArgs<Record<string, string>>) {
    const stripeConnectService = container.resolve<StripeConnectService>('stripeConnectService')
    const orderService = container.resolve<OrderService>('orderService')
    const eventBusService = container.resolve<EventBusService>('eventBusService')

    const order = await orderService.retrieve(data.id, { relations: ['children', 'payments'] })

    if (order.order_parent_id) {
        await eventBusService.emit(OrderService.Events.UPDATED, {
            id: order.id,
        })
        return
    }

    for (const child of order.children) {
        const childOrder = await orderService.retrieveWithTotals(child.id, {
            relations:['store']
        })

        const transfer = await stripeConnectService.createTransfer({
            amount: childOrder.total,
            currency: childOrder.currency_code,
            destination: childOrder.store.stripe_account_id,
            metadata: {
                orderId: childOrder.id,
                orderNumber: childOrder.display_id,
            },
        })
    }
}

export const config: SubscriberConfig = {
    event: OrderService.Events.COMPLETED,
    context: {
        subscriberId: 'order-completed-handler',
    },
}