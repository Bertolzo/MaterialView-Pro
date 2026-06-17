import { pikaLabs }     from './pikaLabs.js';
import { zhipuCogView } from './zhipuCogView.js';
import { waveSpeedAI }  from './waveSpeedAI.js';
import { cometAPI }     from './cometAPI.js';

export function buildProviders() {
  return [
    {
      id: 'pika-labs',
      costTier: 0,
      freeCreditLimit: parseInt(process.env.PIKA_FREE_CREDITS_LIMIT || '80', 10),
      envKey: 'PIKA_API_KEY',
      call: pikaLabs,
    },
    {
      id: 'zhipu-cogview',
      costTier: 0,
      freeCreditLimit: parseInt(process.env.ZHIPU_FREE_CREDITS_LIMIT || '0', 10),
      envKey: 'ZHIPU_API_KEY',
      call: zhipuCogView,
    },
    {
      id: 'wavespeed-ai',
      costTier: 1,
      freeCreditLimit: 0,
      envKey: 'WAVESPEED_API_KEY',
      call: waveSpeedAI,
    },
    {
      id: 'comet-api',
      costTier: 2,
      freeCreditLimit: 0,
      envKey: 'COMET_API_KEY',
      call: cometAPI,
    },
  ];
}
