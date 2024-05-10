import { Cart, ShippingOptionService as MedusaShippingOptionService } from '@medusajs/medusa'
import { CreateShippingOptionInput as MedusaCreateShippingOptionInput } from '@medusajs/medusa/dist/types/shipping-options'
import { MedusaError } from '@medusajs/utils'

import { Lifetime } from 'awilix'

import { FindConfig, Selector } from '@medusajs/medusa'

import type { ShippingOption } from '../models/shipping-option'
import type { User } from '../models/user'


type ShippingOptionSelector = {
    store_id?: string
} & Selector<ShippingOption>


type CreateShippingOptionInput = {
    store_id?: string
} & MedusaCreateShippingOptionInput


class ShippingOptionService extends MedusaShippingOptionService {
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

    async list(
        selector?: ShippingOptionSelector & { q?: string },
        config?: FindConfig<ShippingOption>,
    ): Promise<ShippingOption[]> {
        if (!selector.store_id && this.loggedInUser_?.store_id) {
            selector.store_id = this.loggedInUser_.store_id
        }

        config.select?.push('store_id')

        config.relations?.push('store')

        return await super.list(selector, config)
    }

    async listAndCount(
        selector?: ShippingOptionSelector & { q?: string },
        config?: FindConfig<ShippingOption>,
    ): Promise<[ShippingOption[], number]> {
        if (!selector.store_id && this.loggedInUser_?.store_id) {
            selector.store_id = this.loggedInUser_.store_id
        }

        config.select?.push('store_id')

        config.relations?.push('store')

        return await super.listAndCount(selector, config)
    }


    async create(data: CreateShippingOptionInput): Promise<ShippingOption> {
        if (!data.store_id && this.loggedInUser_?.store_id) {
            data.store_id = this.loggedInUser_.store_id
        }

        return await super.create(data)
    }

    async validateCartOption(option: ShippingOption, cart: Cart): Promise<ShippingOption | null> {
        let validatedOption = await super.validateCartOption(option, cart)

        const hasAnItem = cart.items.some((item) => item.variant.product.store_id === option.store_id)

        if (!hasAnItem) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Shipping option does not exist for store')
        }

        return validatedOption
    }
}

export default ShippingOptionService