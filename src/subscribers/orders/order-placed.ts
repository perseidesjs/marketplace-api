import {
    LineItem,
    Logger,
    OrderService,
    ShippingMethod,
    type SubscriberArgs,
    type SubscriberConfig
} from '@medusajs/medusa'
import ShippingOptionService from 'src/services/shipping-option'
import { EntityManager } from 'typeorm'

import { Order } from '../../models/order'
import { Product } from '../../models/product'
import { Payment } from '../../models/payment'

import ProductService from '../../services/product'


export default async function handleOrderPlaced({
    data,
    eventName,
    container,
    pluginOptions,
}: SubscriberArgs<Record<string, string>>) {
    const manager = container.resolve<EntityManager>('manager')
    const logger = container.resolve<Logger>('logger')

    await manager.transaction(async (m) => {
        const orderService: OrderService = container.resolve<OrderService>('orderService')
        const productService: ProductService = container.resolve<ProductService>('productService')
        const shippingOptionService: ShippingOptionService =
            container.resolve<ShippingOptionService>('shippingOptionService')


        const orderRepo = m.getRepository(Order)
        const lineItemRepo = m.getRepository(LineItem)
        const shippingMethodRepo = m.getRepository(ShippingMethod)
        const paymentRepo = m.getRepository(Payment)

        const orderActivity = logger.activity(`Splitting order ${data.id} into child orders...`)

        const order = await orderService.retrieve(data.id, {
            relations: ['items', 'items.variant', 'items.variant.prices', 'cart', 'payments', 'shipping_methods'],
        })

        if (!order) {
            logger.failure(orderActivity, `OrderPlacedSubscriber | Order not found for order id ${data.id}.`)
            return
        }

        // #1 : Group Items By Store Id

        const storesWithItems = new Map<string, Order['items']>()

        for (const item of order.items) {
            const product: Product = await productService.retrieve(item.variant.product_id)
            const storeId = product.store_id

            if (!storeId) {
                logger.failure(orderActivity, `OrderPlacedSubscriber | product.store_id not found for product ${product.id}.`)
                continue
            }

            if (!storesWithItems.has(storeId)) {
                storesWithItems.set(storeId, [])
            }

            storesWithItems.get(storeId).push(item)
        }

        // #2 : For each store, create a new order with the relevant items and shipping methods
        for (const [storeId, items] of storesWithItems.entries()) {

            // #2.1 : Create a new order
            const childOrder = orderRepo.create({
                ...order,
                order_parent_id: order.id,
                store_id: storeId,
                cart_id: null,
                cart: null,
                id: null,
                shipping_methods: [],
            })

            const savedChildOrder = await orderRepo.save(childOrder)

            // #2.2 : Create a new line item for each item in the order
            let totalItemsAmount: number = 0
            for (const item of items) {
                const lineItem = lineItemRepo.create({
                    ...item,
                    order_id: savedChildOrder.id,
                    cart_id: null,
                    id: null,
                })

                await lineItemRepo.save(lineItem)


                // We compute the total order amount for the child order
                totalItemsAmount += item.total ?? item.unit_price * item.quantity
            }

            // #2.3 : Create a new shipping method for each child order with a matching shipping option that is in the same store
            let totalShippingAmount: number = 0
            for (const shippingMethod of order.shipping_methods) {
                const shippingOption = await shippingOptionService.retrieve(shippingMethod.shipping_option_id)

                if (shippingOption.store_id !== storeId) {
                    continue
                }

                const newShippingMethod = shippingMethodRepo.create({
                    ...shippingMethod,
                    id: null,
                    cart_id: null,
                    cart: null,
                    order_id: savedChildOrder.id,
                })

                await shippingMethodRepo.save(newShippingMethod)

                totalShippingAmount += shippingMethod.total
            }

            const childPayment = paymentRepo.create({
                ...order.payments[0], // In our case, we only have one payment for the order
                payment_parent_id: order.payments[0].id,
                order_id: savedChildOrder.id,
                amount: totalItemsAmount + totalShippingAmount, // This is the total amount of the child order
                cart_id: null,
                cart: null,
                id: null,
                data:null,
            })

            await paymentRepo.save(childPayment)
        }

        logger.success(orderActivity, `OrderPlacedSubscriber | Order ${data.id} has been split into ${storesWithItems.size} child orders.`)
    })
}

export const config: SubscriberConfig = {
    event: OrderService.Events.PLACED,
    context: {
        subscriberId: 'order-placed-handler',
    },
}
