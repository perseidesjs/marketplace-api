import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'

import { ShippingProfile as MedusaShippingProfile } from '@medusajs/medusa'

import { Store } from './store'

@Entity()
export class ShippingProfile extends MedusaShippingProfile {
    @Index('ShippingProfileStoreId')
    @Column({ nullable: true })
    store_id?: string

    @ManyToOne(() => Store, (store) => store.shippingProfiles)
    @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
    store?: Store
}
