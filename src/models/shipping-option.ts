import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'

import { ShippingOption as MedusaShippingOption } from '@medusajs/medusa'

import { Store } from './store'

@Entity()
export class ShippingOption extends MedusaShippingOption {
    @Index('ShippingOptionStoreId')
    @Column({ nullable: true })
    store_id?: string

    @ManyToOne(() => Store, (store) => store.shippingOptions)
    @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
    store?: Store
}
