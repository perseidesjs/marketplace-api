// src/services/product.ts

import type { FindProductConfig, CreateProductInput as MedusaCreateProductInput } from '@medusajs/medusa/dist/types/product'
import { ProductService as MedusaProductService } from '@medusajs/medusa'
import { Lifetime } from 'awilix'
import { ProductSelector as MedusaProductSelector } from '@medusajs/medusa/dist/types/product'


import type { User } from '../models/user'
import type { Product } from '../models/product'

// We override the type definition so it will not throw TS errors in the `create` method
type CreateProductInput = {
    store_id?: string
} & MedusaCreateProductInput

type ProductSelector = {
    store_id?: string
} & MedusaProductSelector


class ProductService extends MedusaProductService {
    static LIFE_TIME = Lifetime.TRANSIENT
    protected readonly loggedInUser_: User | null

    constructor(container) {
        // @ts-ignore
        super(...arguments)

        try {
            this.loggedInUser_ = container.loggedInUser
        } catch (e) {
            // avoid errors when backend first runs
        }
    }
    async listAndCount(selector: ProductSelector, config?: FindProductConfig): Promise<[Product[], number]> {
        if (!selector.store_id && this.loggedInUser_?.store_id) {
            selector.store_id = this.loggedInUser_.store_id
        }

        config.select?.push('store_id')

        config.relations?.push('store')

        const products = await super.listAndCount(selector, config)
        return products
    }

    async create(productObject: CreateProductInput): Promise<Product> {
        if (!productObject.store_id && this.loggedInUser_?.store_id) {
            productObject.store_id = this.loggedInUser_.store_id

            // This will generate a handle for the product based on the title and store_id
            // e.g. "sunglasses-01HXVYMJF9DW..."
            const title = productObject.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').toLowerCase()
            const store_id = this.loggedInUser_.store_id.replace("store_", "")

            productObject.handle = `${title}-${store_id}`
        }

        const product = await super.create(productObject)
        return product
    }
}

export default ProductService
