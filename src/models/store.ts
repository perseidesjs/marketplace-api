// src/models/store.ts
import { Entity, OneToMany } from 'typeorm'

import { Store as MedusaStore } from '@medusajs/medusa'

import { Product } from './product'
import { User } from './user'

@Entity()
export class Store extends MedusaStore {
    @OneToMany(() => User, (user) => user.store)
    members?: User[]

    @OneToMany(() => Product, (product) => product.store)
    products?: Product[]
}
