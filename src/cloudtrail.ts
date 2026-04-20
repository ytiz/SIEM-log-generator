const ACCOUNT_ID = '123456789012';
const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'] as const;

const IAM_USERS = [
  { userName: 'alice.chen',   arn: `arn:aws:iam::${ACCOUNT_ID}:user/alice.chen`   },
  { userName: 'bob.smith',    arn: `arn:aws:iam::${ACCOUNT_ID}:user/bob.smith`    },
  { userName: 'carol.jones',  arn: `arn:aws:iam::${ACCOUNT_ID}:user/carol.jones`  },
  { userName: 'dave.nguyen',  arn: `arn:aws:iam::${ACCOUNT_ID}:user/dave.nguyen`  },
  { userName: 'eve.torres',   arn: `arn:aws:iam::${ACCOUNT_ID}:user/eve.torres`   },
  { userName: 'frank.miller', arn: `arn:aws:iam::${ACCOUNT_ID}:user/frank.miller` },
  { userName: 'grace.lee',    arn: `arn:aws:iam::${ACCOUNT_ID}:user/grace.lee`    },
  { userName: 'heidi.patel',  arn: `arn:aws:iam::${ACCOUNT_ID}:user/heidi.patel`  },
];

const S3_BUCKETS    = ['sentinel-data-prod', 'corp-backups-2024', 'dev-assets-bucket', 'marketing-content'];
const EC2_INSTANCES = ['i-0a1b2c3d4e5f6789a', 'i-0b2c3d4e5f6789ab', 'i-0c3d4e5f6789abc0'];
const RDS_INSTANCES = ['prod-mysql-01', 'analytics-postgres', 'app-db-replica'];
const CF_DISTS      = ['EDFDVBD6EXAMPLE', 'E2QWRUHEXAMPLE', 'E1VYHNL6EXAMPLE'];
const ALB_NAMES     = ['prod-alb', 'staging-alb', 'internal-api-alb'];

const USER_AGENTS = [
  'console.aws.amazon.com',
  'aws-cli/2.13.0 Python/3.11.4',
  'Boto3/1.28.0 Python/3.10.12',
  'Terraform/1.5.7',
  'aws-sdk-go/1.44.0',
];

interface EventDef {
  eventSource: string;
  eventName: string;
  weight: number;
  errorCode?: string;
  errorMessage?: string;
  requestParameters?: Record<string, unknown>;
  responseElements?: Record<string, unknown>;
}

const IAM_EVENTS: EventDef[] = [
  { eventSource: 'signin.amazonaws.com', eventName: 'ConsoleLogin', errorCode: 'Failed authentication', errorMessage: 'Failed authentication', responseElements: { ConsoleLogin: 'Failure' }, weight: 35 },
  { eventSource: 'iam.amazonaws.com', eventName: 'AttachUserPolicy', requestParameters: { userName: null, policyArn: 'arn:aws:iam::aws:policy/AdministratorAccess' }, weight: 12 },
  { eventSource: 'iam.amazonaws.com', eventName: 'CreateUser', requestParameters: { userName: 'svc-backdoor' }, weight: 8 },
  { eventSource: 'iam.amazonaws.com', eventName: 'AssumeRole', requestParameters: { roleArn: `arn:aws:iam::${ACCOUNT_ID}:role/AdminRole` }, weight: 15 },
  { eventSource: 'iam.amazonaws.com', eventName: 'CreateAccessKey', requestParameters: { userName: null }, weight: 18 },
  { eventSource: 'iam.amazonaws.com', eventName: 'UpdateLoginProfile', requestParameters: { userName: null, passwordResetRequired: false }, weight: 8 },
  { eventSource: 'signin.amazonaws.com', eventName: 'ConsoleLogin', responseElements: { ConsoleLogin: 'Success' }, weight: 50 },
];

const S3_EVENTS: EventDef[] = [
  { eventSource: 's3.amazonaws.com', eventName: 'GetObject', errorCode: 'AccessDenied', errorMessage: 'Access Denied', weight: 20 },
  { eventSource: 's3.amazonaws.com', eventName: 'PutBucketPolicy', requestParameters: { bucketPolicy: '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*"}]}' }, weight: 10 },
  { eventSource: 's3.amazonaws.com', eventName: 'PutBucketAcl', requestParameters: { acl: 'public-read' }, weight: 8 },
  { eventSource: 's3.amazonaws.com', eventName: 'DeleteObject', weight: 12 },
  { eventSource: 's3.amazonaws.com', eventName: 'ListBuckets', errorCode: 'AccessDenied', errorMessage: 'Access Denied', weight: 10 },
  { eventSource: 's3.amazonaws.com', eventName: 'GetObject', weight: 40 },
];

const EC2_EVENTS: EventDef[] = [
  { eventSource: 'ec2.amazonaws.com', eventName: 'RunInstances', requestParameters: { instanceType: 'p3.8xlarge', minCount: 4, maxCount: 4 }, weight: 10 },
  { eventSource: 'ec2.amazonaws.com', eventName: 'AuthorizeSecurityGroupIngress', requestParameters: { ipPermissions: [{ ipProtocol: 'tcp', fromPort: 22, toPort: 22, ipRanges: ['0.0.0.0/0'] }] }, weight: 15 },
  { eventSource: 'ec2.amazonaws.com', eventName: 'AuthorizeSecurityGroupIngress', requestParameters: { ipPermissions: [{ ipProtocol: 'tcp', fromPort: 3389, toPort: 3389, ipRanges: ['0.0.0.0/0'] }] }, weight: 10 },
  { eventSource: 'ec2.amazonaws.com', eventName: 'TerminateInstances', weight: 8 },
  { eventSource: 'ec2.amazonaws.com', eventName: 'CreateSecurityGroup', weight: 12 },
  { eventSource: 'ec2.amazonaws.com', eventName: 'StopInstances', weight: 20 },
];

const RDS_EVENTS: EventDef[] = [
  { eventSource: 'rds.amazonaws.com', eventName: 'CreateDBSnapshot', requestParameters: { dBInstanceIdentifier: null, dBSnapshotIdentifier: 'manual-snap' }, weight: 20 },
  { eventSource: 'rds.amazonaws.com', eventName: 'CopyDBSnapshot', requestParameters: { sourceDBSnapshotIdentifier: null, targetDBSnapshotIdentifier: 'exfil-copy' }, weight: 8 },
  { eventSource: 'rds.amazonaws.com', eventName: 'RestoreDBInstanceFromDBSnapshot', requestParameters: { dBInstanceIdentifier: 'restored-db', publiclyAccessible: true }, weight: 8 },
  { eventSource: 'rds.amazonaws.com', eventName: 'DeleteDBInstance', requestParameters: { skipFinalSnapshot: true }, weight: 5 },
  { eventSource: 'rds.amazonaws.com', eventName: 'ModifyDBInstance', requestParameters: { publiclyAccessible: true, applyImmediately: true }, weight: 10 },
  { eventSource: 'rds.amazonaws.com', eventName: 'CreateDBInstance', weight: 15 },
];

const CLOUDFRONT_EVENTS: EventDef[] = [
  { eventSource: 'cloudfront.amazonaws.com', eventName: 'UpdateDistribution', requestParameters: { distributionConfig: { origins: { quantity: 1 } } }, weight: 20 },
  { eventSource: 'cloudfront.amazonaws.com', eventName: 'DeleteDistribution', weight: 5 },
  { eventSource: 'cloudfront.amazonaws.com', eventName: 'CreateDistribution', weight: 10 },
];

const ALB_EVENTS: EventDef[] = [
  { eventSource: 'elasticloadbalancing.amazonaws.com', eventName: 'ModifyListener', requestParameters: { defaultActions: [{ type: 'redirect' }] }, weight: 15 },
  { eventSource: 'elasticloadbalancing.amazonaws.com', eventName: 'DeleteLoadBalancer', weight: 5 },
  { eventSource: 'elasticloadbalancing.amazonaws.com', eventName: 'CreateLoadBalancer', weight: 10 },
];

export const SERVICE_POOLS = [
  { name: 'IAM',        defs: IAM_EVENTS,        share: 0.30 },
  { name: 'S3',         defs: S3_EVENTS,         share: 0.22 },
  { name: 'EC2',        defs: EC2_EVENTS,         share: 0.18 },
  { name: 'RDS',        defs: RDS_EVENTS,         share: 0.15 },
  { name: 'CloudFront', defs: CLOUDFRONT_EVENTS,  share: 0.08 },
  { name: 'ALB',        defs: ALB_EVENTS,         share: 0.07 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function weightedPick(defs: EventDef[]): EventDef {
  const total = defs.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of defs) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return defs[defs.length - 1] as EventDef;
}

function randomIp(): string {
  return `203.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function randomUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function randomTimestamp(monthsBack: number): string {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end   = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

function buildResources(def: EventDef, region: string): unknown[] | undefined {
  const src = def.eventSource;
  if (src === 's3.amazonaws.com') {
    return [{ ARN: `arn:aws:s3:::${pick(S3_BUCKETS)}`, accountId: ACCOUNT_ID, type: 'AWS::S3::Bucket' }];
  }
  if (src === 'ec2.amazonaws.com') {
    return [{ ARN: `arn:aws:ec2:${region}:${ACCOUNT_ID}:instance/${pick(EC2_INSTANCES)}`, accountId: ACCOUNT_ID, type: 'AWS::EC2::Instance' }];
  }
  if (src === 'rds.amazonaws.com') {
    return [{ ARN: `arn:aws:rds:${region}:${ACCOUNT_ID}:db:${pick(RDS_INSTANCES)}`, accountId: ACCOUNT_ID, type: 'AWS::RDS::DBInstance' }];
  }
  if (src === 'cloudfront.amazonaws.com') {
    return [{ ARN: `arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${pick(CF_DISTS)}`, accountId: ACCOUNT_ID, type: 'AWS::CloudFront::Distribution' }];
  }
  if (src === 'elasticloadbalancing.amazonaws.com') {
    return [{ ARN: `arn:aws:elasticloadbalancing:${region}:${ACCOUNT_ID}:loadbalancer/app/${pick(ALB_NAMES)}/abcdef123456`, accountId: ACCOUNT_ID, type: 'AWS::ElasticLoadBalancingV2::LoadBalancer' }];
  }
  return undefined;
}

export function buildCloudTrailEvent(def: EventDef, monthsBack: number): Record<string, unknown> {
  const user   = pick(IAM_USERS);
  const region = pick([...REGIONS]);

  let reqParams = def.requestParameters ? { ...def.requestParameters } : null;
  if (reqParams) {
    if ('userName' in reqParams && reqParams.userName === null) {
      reqParams.userName = user.userName;
    }
    if ('dBInstanceIdentifier' in reqParams && reqParams.dBInstanceIdentifier === null) {
      reqParams.dBInstanceIdentifier = pick(RDS_INSTANCES);
    }
    if ('sourceDBSnapshotIdentifier' in reqParams && reqParams.sourceDBSnapshotIdentifier === null) {
      reqParams.sourceDBSnapshotIdentifier = `rds:${pick(RDS_INSTANCES)}-2025-01-01`;
    }
  }

  const readOnlyEvents = ['GetObject', 'ListBuckets', 'GetBucketAcl', 'ConsoleLogin'];

  return {
    eventVersion: '1.08',
    userIdentity: {
      type:        'IAMUser',
      principalId: `AIDA${randomUuid().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
      arn:         user.arn,
      accountId:   ACCOUNT_ID,
      userName:    user.userName,
    },
    eventTime:         randomTimestamp(monthsBack),
    eventSource:       def.eventSource,
    eventName:         def.eventName,
    awsRegion:         region,
    sourceIPAddress:   randomIp(),
    userAgent:         pick(USER_AGENTS),
    errorCode:         def.errorCode    ?? undefined,
    errorMessage:      def.errorMessage ?? undefined,
    requestParameters: reqParams,
    responseElements:  def.responseElements ?? null,
    readOnly:          readOnlyEvents.includes(def.eventName),
    eventType:         def.eventSource === 'signin.amazonaws.com' ? 'AwsConsoleSignIn' : 'AwsApiCall',
    managementEvent:   def.eventSource !== 's3.amazonaws.com' || def.eventName !== 'GetObject',
    resources:         buildResources(def, region),
  };
}

const BATCH_SIZE = 25;

export interface PoolBatches {
  name: string;
  batches: Record<string, unknown>[][];
}

export function buildAnalyticsBatch(total: number): PoolBatches[] {
  return SERVICE_POOLS.map((pool) => {
    const count   = Math.round(total * pool.share);
    const records = Array.from({ length: count }, (_, i) =>
      buildCloudTrailEvent(weightedPick(pool.defs), i % 12),
    );

    const batches: Record<string, unknown>[][] = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    return { name: pool.name, batches };
  });
}
