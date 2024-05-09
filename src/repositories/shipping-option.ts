// src/repositories/shipping-option.ts
import { ShippingOption } from '../models/shipping-option'
import { dataSource } from '@medusajs/medusa/dist/loaders/database'
import { ShippingOptionRepository as MedusaShippingOptionRepository } from '@medusajs/medusa/dist/repositories/shipping-option'

export const ShippingOptionRepository = dataSource
    .getRepository(ShippingOption)
    .extend(Object.assign(MedusaShippingOptionRepository, { target: ShippingOption }))

export default ShippingOptionRepository