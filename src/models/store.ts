// src/models/store.ts
import { Store as MedusaStore } from '@medusajs/medusa';
import { Entity, OneToMany } from 'typeorm';
import { User } from './user';

@Entity()
export class Store extends MedusaStore {
    @OneToMany(() => User, (user) => user.store)
    members?: User[];
}
