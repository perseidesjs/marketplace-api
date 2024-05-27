import { FindConfig, OrderService as MedusaOrderService, PaymentStatus, Refund, Selector } from '@medusajs/medusa'
import { Lifetime } from 'awilix'
import { MedusaError } from 'medusa-core-utils'

import PaymentRepository from '@medusajs/medusa/dist/repositories/payment'

import type { User } from '../models/user'
import type { Order } from '../models/order'

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
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `Order with id ${orderId} was not found`
            )
        }

        return order
    }

    /**
     * When a parent payment is captured, we capture the parent order payment but also every child order payment
     */
    async capturePayment(orderId: string): Promise<Order> {
        const order = await this.retrieveWithTotals(orderId, { relations: ['payments', 'children'] })

        if (order.order_parent_id) {
            throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                `Order with id ${orderId} is a child order and cannot be captured.`
            )
        }

        return await this.atomicPhase_(async (m) => {
            const orderRepo = m.withRepository(this.orderRepository_)
            const paymentRepo = m.withRepository(PaymentRepository)

            for (const child of order.children) {
                const childOrder = await orderRepo.findOne({
                    where: {
                        id: child.id
                    },
                    relations: ['payments']
                })

                if (!childOrder.payments.at(0).captured_at) {
                    await paymentRepo.update(childOrder.payments.at(0).id, {
                        captured_at: new Date()
                    })
                    await orderRepo.update(child.id, {
                        payment_status: PaymentStatus.CAPTURED
                    })
                }
            }

            return await super.capturePayment(order.id)
        })
    }

    async createRefund(orderId: string, refundAmount: number, reason: string, note?: string, config?: { no_notification?: boolean }): Promise<Order> {
        const order = await this.retrieveWithTotals(orderId, { relations: ['payments'] })

        if (!order.order_parent_id) {
            // This means we are refunding from the parent order...
            return await super.createRefund(orderId, refundAmount, reason, note, config)
        }

        // Means the refund have occured on a child order,
        // so we need to refund from the parent order and compute the new child order amount
        return await this.atomicPhase_(async (m) => {
            const orderRepo = m.withRepository(this.orderRepository_)
            const refundRepo = m.getRepository(Refund)

            // If the refund amount is greater than the order amount, we can't refund
            if (refundAmount > order.refundable_amount) {
                throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, 'Refund amount is greater than the order amount')
            }

            // We refund from the parent order
            let parentOrder = await this.retrieve(order.order_parent_id)
            parentOrder = await super.createRefund(order.order_parent_id, refundAmount, reason, `${note}\n\nRefund from child order : ${order.id}`, config)


            // We create a refund for the child order, for future computation (refundable_amount)
            const refund = refundRepo.create({
                order_id: order.id,
                amount: refundAmount,
                reason,
                note: `${note}\n\nRefund from child order : ${order.id}`,
                payment_id: order.payments?.at(0)?.id
            })
            await refundRepo.save(refund)

            // We check if the child order payment is fully refunded
            // If it is, we can set the payment status to REFUNDED
            // Otherwise, we set the payment status to PARTIALLY_REFUNDED
            const childOrderPayment = order.payments?.at(0)

            const amountRefunded = childOrderPayment.amount_refunded + refundAmount

            const isFullyRefunded = amountRefunded === childOrderPayment.amount

            await orderRepo.update(order.id, {
                payment_status: isFullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED
            })

            return await this.retrieve(order.id)
        })
    }

}

export default OrderService
