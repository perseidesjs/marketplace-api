import type { User } from './models/user'
import type { Product } from './models/product'
import type { Store } from './models/store'
import type { Order } from './models/order'
import type { ShippingOption } from './models/shipping-option'
import type { ShippingProfile } from './models/shipping-profile'

declare module '@medusajs/medusa/dist/models/store' {
    interface Store {
        members?: User[]
        products?: Product[]
        shippingOptions?: ShippingOption[]
        shippingProfiles?: ShippingProfile[]
    }
}

declare module '@medusajs/medusa/dist/models/user' {
    interface User {
        store_id?: string
        store?: Store
    }
}

declare module '@medusajs/medusa/dist/models/product' {
    interface Product {
        store_id?: string
        store?: Store
    }
}

declare module '@medusajs/medusa/dist/models/shipping-option' {
    interface ShippingOption {
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

declare module '@medusajs/medusa/dist/models/order' {
    interface Order {
        store_id?: string
        store?: Store
        order_parent_id?: string
        parent?: Order
        children?: Order[]
    }
}