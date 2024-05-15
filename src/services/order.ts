import { FindConfig, OrderService as MedusaOrderService, Order, PaymentStatus, Selector } from '@medusajs/medusa'
import { Lifetime } from 'awilix'
import { MedusaError } from 'medusa-core-utils'

import type { User } from '../models/user'
import PaymentRepository from '@medusajs/medusa/dist/repositories/payment'

type OrderSelector = {
    store_id?: string
} & Selector<Order>

class OrderService extends MedusaOrderService {
    static LIFE_TIME = Lifetime.TRANSIENT

    protected readonly loggedInUser_: User | null

    constructor(container, options) {
        // @ts-ignore
        super(...arguments)

        try {
            this.loggedInUser_ = container.loggedInUser
        } catch (e) {
            // avoid errors when backend first runs
        }
    }

    async list(selector: OrderSelector, config?: FindConfig<Order>): Promise<Order[]> {
        if (!selector.store_id && this.loggedInUser_?.store_id) {
            selector.store_id = this.loggedInUser_.store_id
        }

        config.select?.push('store_id')

        config.relations?.push('store')

        return await super.list(selector, config)
    }

    async listAndCount(selector: OrderSelector, config?: FindConfig<Order>): Promise<[Order[], number]> {
        if (!selector.store_id && this.loggedInUser_?.store_id) {
            selector.store_id = this.loggedInUser_.store_id
        }

        config.select?.push('store_id')

        config.relations?.push('store')

        return await super.listAndCount(selector, config)
    }

    async retrieve(orderId: string, config: FindConfig<Order> = {}): Promise<Order> {

        config.relations = [...(config.relations || []), 'store']

        const order = await super.retrieve(orderId, config)

        if (order.store?.id && this.loggedInUser_?.store_id && order.store.id !== this.loggedInUser_.store_id) {
            throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Product does not exist')
        }

        return order
    }

    async createRefund(orderId: string, refundAmount: number, reason: string, note?: string, config?: { no_notification?: boolean }): Promise<Order> {
        const order = await this.retrieveWithTotals(orderId, { relations: ['payments'] })

        if (!order.order_parent_id) {
            // This means we are refunding from the parent order...
            return await super.createRefund(orderId, refundAmount, reason, note, config)
        }

        // Means the refund have occured on a child order, so we need to refund from the parent order and compute the new child order amount
        return this.atomicPhase_(async (m) => {
            const paymentRepo = m.withRepository(PaymentRepository)
            const orderRepo = m.withRepository(this.orderRepository_)

            if (refundAmount > order.refundable_amount) {
                throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, 'Refund amount is greater than the order amount')
            }

            let parentOrder = await this.retrieve(order.order_parent_id)
            parentOrder = await super.createRefund(order.order_parent_id, refundAmount, reason, note, config)

            let childOrderPayment = order.payments?.at(0)

            childOrderPayment = await paymentRepo.save({
                ...childOrderPayment,
                amount_refunded: childOrderPayment.amount_refunded + refundAmount
            })

            const isFullyRefunded = childOrderPayment.amount_refunded === childOrderPayment.amount

            await orderRepo.update(order.id, {
                payment_status: isFullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED
            })

            return await this.retrieve(order.id)
        })
    }

}

export default OrderService
