import { FindConfig, OrderService as MedusaOrderService, Order, Selector } from '@medusajs/medusa'
import { Lifetime } from 'awilix'
import { MedusaError } from 'medusa-core-utils'

import type { User } from '../models/user'

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
}

export default OrderService
