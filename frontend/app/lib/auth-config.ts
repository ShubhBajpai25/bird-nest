import { ResourcesConfig } from 'aws-amplify';

export const authConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-2_JTicTsnkV',
      userPoolClientId: '3mqkio6onh20u3gk5tkhmd0bn0',
    }
  }
};