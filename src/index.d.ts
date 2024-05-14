import type { Product } from './models/product'
import type { Store } from './models/store'

declare module '@medusajs/medusa/dist/models/product' {
    interface Product {
        store_id?: string
        store?: Store
    }
}