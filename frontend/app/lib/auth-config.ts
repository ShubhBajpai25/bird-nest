import { ResourcesConfig } from 'aws-amplify';

export const authConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-2_Rub8Ulssa',
      userPoolClientId: 'e4drckb4titsgv56hd31bpka8',
    }
  }
};