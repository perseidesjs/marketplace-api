import type { Product } from './models/product'
import type { ShippingProfile } from './models/shipping-profile'

declare module '@medusajs/medusa/dist/models/product' {
    interface Product {
        store_id?: string
        store?: Store
    }
}

declare module '@medusajs/medusa/dist/models/shipping-profile' {
    interface ShippingProfile {
        store_id?: string
        store?: Store
    }
}