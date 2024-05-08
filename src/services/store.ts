// src/services/store.ts
import { type FindConfig, StoreService as MedusaStoreService, buildQuery } from "@medusajs/medusa"
import { Lifetime } from 'awilix'

import type { User } from "../models/user"
import type { Store } from "../models/store"

class StoreService extends MedusaStoreService {
    static LIFE_TIME = Lifetime.TRANSIENT
    protected readonly loggedInUser_: User | null

    constructor(container, options) {
        // @ts-ignore
        super(...arguments)

        try {
            this.loggedInUser_ = container.loggedInUser
        } catch (e) {
            // avoid errors when backend first runs
        }
    }

    async retrieve(config?: FindConfig<Store>): Promise<Store> {
        if (!this.loggedInUser_ || !this.loggedInUser_.store_id) {
            // In case there is no loggedInUser or no store_id, 
            // we just use the original function 
            // that retrieves the default store
            return await super.retrieve(config)
        }

        const storeRepo = this.activeManager_.withRepository(this.storeRepository_)

        const query = buildQuery<Partial<Store>, Store>(
            {
                id: this.loggedInUser_.store_id,
            },
            {
                ...config,
                relations: [...(config?.relations || []), 'members'],
            },
        )

        return await storeRepo.findOne(query)
    }
}

export default StoreService