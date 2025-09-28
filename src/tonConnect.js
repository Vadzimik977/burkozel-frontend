import { TonConnect } from '@tonconnect/sdk';

const dappMetadata = {
    manifestUrl: './ton-manifest.json'
}

export const connector = new TonConnect(dappMetadata)