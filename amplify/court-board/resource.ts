import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

export const COURT_BOARD_GSI1 = 'GSI1';

/**
 * Court Board's single DynamoDB table and the customer-managed policy that
 * grants item-level access to it. See docs/adr/0013-court-board-public-lab.md.
 *
 * The policy is not attached to anything here: the Amplify SSR Compute role
 * lives outside Gen 2, so attaching `courtBoardPolicyArn` is one manual
 * console step (docs/court-board/infra.md).
 */
export function createCourtBoardResources(scope: Construct) {
  const table = new Table(scope, 'CourtBoardTable', {
    partitionKey: { name: 'pk', type: AttributeType.STRING },
    sortKey: { name: 'sk', type: AttributeType.STRING },
    billingMode: BillingMode.PAY_PER_REQUEST,
    timeToLiveAttribute: 'ttl',
    pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    deletionProtection: true,
    removalPolicy: RemovalPolicy.RETAIN,
  });

  // Sessions of a Club by date. Items projected here are Session META items
  // only, so ALL costs nothing extra and saves a read per row.
  table.addGlobalSecondaryIndex({
    indexName: COURT_BOARD_GSI1,
    partitionKey: { name: 'gsi1pk', type: AttributeType.STRING },
    sortKey: { name: 'gsi1sk', type: AttributeType.STRING },
    projectionType: ProjectionType.ALL,
  });

  const policy = new ManagedPolicy(scope, 'CourtBoardTablePolicy', {
    description: 'Item-level access to the Court Board DynamoDB table only',
    statements: [
      new PolicyStatement({
        // TransactWriteItems is authorised by the underlying Put, Update,
        // Delete and ConditionCheck actions; it is listed for clarity.
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:TransactWriteItems',
          'dynamodb:ConditionCheckItem',
        ],
        resources: [table.tableArn, `${table.tableArn}/index/*`],
      }),
    ],
  });

  return { table, policy };
}
