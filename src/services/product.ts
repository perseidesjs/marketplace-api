// src/services/product.ts

import type { CreateProductInput as MedusaCreateProductInput } from '@medusajs/medusa/dist/types/product'
import { ProductService as MedusaProductService } from '@medusajs/medusa'
import { Lifetime } from 'awilix'

import type { User } from '../models/user'
import type { Product } from '../models/product'

// We override the type definition so it will not throw TS errors in the `create` method
type CreateProductInput = {
    store_id?: string
} & MedusaCreateProductInput

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

    async create(productObject: CreateProductInput): Promise<Product> {
        if (!productObject.store_id && this.loggedInUser_?.store_id) {
            productObject.store_id = this.loggedInUser_.store_id
        }

        return await super.create(productObject)
    }
}

export default ProductService
