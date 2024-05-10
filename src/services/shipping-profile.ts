import {
    FindConfig,
    ShippingProfileService as MedusaShippingProfileService,
    Selector,
    ShippingProfileType
} from '@medusajs/medusa'
import { Lifetime } from 'awilix'

import { ShippingProfile } from '../models/shipping-profile'
import type { User } from '../models/user'

type ShippingProfileSelector = {
    store_id?: string
} & Selector<ShippingProfile>

class ShippingProfileService extends MedusaShippingProfileService {
    static LIFE_TIME = Lifetime.TRANSIENT
    protected readonly loggedInUser_: User | null

    constructor(container, options) {
        // @ts-ignore
        super(...arguments)

        try {
            this.loggedInUser_ = container.loggedInUser
        } catch (e) {
            //  avoid errors when backend first runs
        }
    }

    async list(
        selector: ShippingProfileSelector = {},
        config: FindConfig<ShippingProfile> = {}
    ): Promise<ShippingProfile[]> {
        if (!selector.store_id && this.loggedInUser_?.store_id){
            selector.store_id = this.loggedInUser_.store_id
        }

        config.relations = [...(config.relations ?? []), 'store'];

        config.select = [
            ...(config.select ?? []),
            'id',
            'name',
            'created_at',
            'deleted_at',
            'updated_at',
            'type',
            'store_id',
            'metadata',
        ];

        return await super.list(selector, config);
    }


    async createDefaultForStore(storeId: string): Promise<ShippingProfile> {
        return await this.atomicPhase_(async (manager) => {
            const profileRepository = manager.withRepository(this.shippingProfileRepository_)

            const profile = await profileRepository.findOne({ where: { store_id: storeId } })
            if (profile) {
                return profile
            }

            const toCreate: Partial<ShippingProfile> = {
                type: ShippingProfileType.CUSTOM,
                name: 'Default Shipping Profile',
                store_id: storeId,
            }

            const created = profileRepository.create(toCreate)

            return await profileRepository.save(created)
        })
    }
}

export default ShippingProfileService