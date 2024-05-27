// src/api/index.ts
import { registerOverriddenValidators } from "@medusajs/medusa"

// Here we are importing the original Medusa validator as an alias :
import {
    StoreGetProductsParams as MedusaStoreGetProductsParams,
} from "@medusajs/medusa/dist/api/routes/store/products/list-products"
import { IsString, IsOptional } from "class-validator"

// Here we add the new allowed property `store_id` :
class StoreGetProductsParams extends MedusaStoreGetProductsParams {
    @IsString()
    @IsOptional() // Optional of course
    store_id?: string
}

// The following function will replace the original validator by the new one.
registerOverriddenValidators(StoreGetProductsParams)