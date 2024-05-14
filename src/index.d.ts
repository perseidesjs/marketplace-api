import type { Product } from './models/product'

declare module '@medusajs/medusa/dist/models/product' {
    interface Product {
        store_id?: string
    }
}