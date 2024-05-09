// src/repositories/shipping-profile.ts
import { ShippingProfile } from '../models/shipping-profile'
import { dataSource } from '@medusajs/medusa/dist/loaders/database'
import { ShippingProfileRepository as MedusaShippingProfileRepository } from '@medusajs/medusa/dist/repositories/shipping-profile'

export const ShippingProfileRepository = dataSource
    .getRepository(ShippingProfile)
    .extend(Object.assign(MedusaShippingProfileRepository, { target: ShippingProfile }))

export default ShippingProfileRepository