import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { createCourtBoardResources } from './resource';

function synth() {
  const stack = new Stack(new App(), 'CourtBoardTest');
  const resources = createCourtBoardResources(stack);
  return { stack, resources, template: Template.fromStack(stack) };
}

describe('createCourtBoardResources', () => {
  it('creates one on-demand table with TTL, PITR and deletion protection', () => {
    const { template } = synth();
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
      TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
      DeletionProtectionEnabled: true,
    });
    template.hasResource('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('adds GSI1 on gsi1pk / gsi1sk', () => {
    const { template } = synth();
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: [
        Match.objectLike({
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'gsi1pk', KeyType: 'HASH' },
            { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
          ],
        }),
      ],
    });
  });

  it('creates a managed policy with only item-level actions on the table and its indexes', () => {
    const { template } = synth();
    template.resourceCountIs('AWS::IAM::ManagedPolicy', 1);
    const policies = template.findResources('AWS::IAM::ManagedPolicy');
    const [policy] = Object.values(policies);
    const statements = policy.Properties.PolicyDocument.Statement;

    expect(statements).toHaveLength(1);
    expect(statements[0].Effect).toBe('Allow');
    expect([...statements[0].Action].sort()).toEqual(
      [
        'dynamodb:ConditionCheckItem',
        'dynamodb:DeleteItem',
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:Query',
        'dynamodb:TransactWriteItems',
        'dynamodb:UpdateItem',
      ].sort(),
    );
    expect(statements[0].Resource).toHaveLength(2);
    expect(JSON.stringify(statements[0].Resource)).toContain('/index/*');
  });

  it('returns the table and policy for backend outputs', () => {
    const { resources } = synth();
    expect(resources.table.tableName).toBeDefined();
    expect(resources.policy.managedPolicyArn).toBeDefined();
  });
});
