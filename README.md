# IBM E-Commerce Cloud Project

Highly Available Cloud-Native E-Commerce Platform implemented on AWS in **Asia Pacific (Mumbai) - ap-south-1**.

## Architecture

**User -> Application Load Balancer -> Target Group -> EC2 Auto Scaling Group -> Amazon RDS PostgreSQL**

The application tier runs across two Availability Zones. Amazon S3 provides private encrypted/versioned object storage and deployment-artifact storage. Systems Manager Parameter Store provides the runtime database secret. CloudWatch and SNS provide monitoring and alerting.

## Implemented Components

- Custom VPC with public/private subnet segmentation across two Availability Zones
- Application Load Balancer with `/health` target health checks
- Node.js/Express application on EC2
- Auto Scaling Group: minimum 2, desired 2, maximum 4
- CPU target-tracking scaling policy at approximately 50%
- Amazon RDS PostgreSQL in private subnets
- Private S3 bucket with encryption and versioning
- S3 Gateway VPC Endpoint for private S3 access without a NAT Gateway
- IAM role-based AWS access
- Systems Manager Parameter Store SecureString for runtime DB password retrieval
- CloudWatch alarms, CloudWatch Agent memory metrics and SNS notifications
- AMI and Launch Template versioning
- Rolling Auto Scaling Instance Refresh
- RDS automated backups and manual recovery snapshot
- GitHub Actions CI/CD using AWS OIDC

## Application Endpoints

- `/` - application status
- `/health` - ALB health check
- `/products` - reads products from PostgreSQL

## High Availability and Scaling

The compute/application tier runs across two Availability Zones behind the ALB. The ASG maintains two instances and can scale to four.

A failure test was performed by terminating an ASG instance. The remaining healthy target continued serving traffic while the ASG launched replacement capacity.

During controlled concurrent load testing, CPU increased from roughly 2% to about 36%. The ASG remained at two instances because CPU stayed below the configured 50% target.

Amazon RDS is currently **Single-AZ** because this is a Free Tier / cost-controlled academic deployment. Production database HA should use RDS Multi-AZ.

## Security

Traffic between tiers is restricted using security groups:

**Internet -> ALB security group -> Application security group -> Database security group -> RDS**

- No database password or AWS access key is committed to this repository.
- EC2 uses an IAM role.
- GitHub Actions uses an AWS OIDC role and short-lived credentials.
- S3 access is scoped to the project bucket.
- Parameter Store access is scoped to the project DB-password parameter.
- S3 Block Public Access, encryption and versioning are enabled.
- RDS storage encryption is enabled.
- The application uses TLS when connecting to RDS.

## CI/CD

GitHub Actions validates the Node.js project on pushes and pull requests to `main`.

For pushes to `main`, the deployment job:

1. Installs production dependencies.
2. Packages `app.js`, `package.json` and `node_modules`.
3. Authenticates to AWS using OIDC.
4. Uploads `ecommerce-app.tar.gz` to the private S3 `deployments/` prefix.
5. Starts an Auto Scaling Instance Refresh.

Launch Template v5 boot logic retrieves the database password from Parameter Store, downloads the S3 artifact, restarts the application service and performs a local `/health` check.

A deployment attempt was safely rejected with `InstanceRefreshInProgress` when another ASG refresh was already active. Automatic application rollback is not currently implemented.

## Monitoring

Monitoring includes:

- EC2 CPU utilization
- CloudWatch Agent `mem_used_percent`
- ALB target response time
- ALB unhealthy target count
- ALB target 4XX
- ALB target 5XX
- RDS CPU utilization
- SNS alert notifications

A controlled temporary HTTP 500 endpoint was used to generate and verify the ALB target 5XX metric, then removed from the application.

## Backup and Disaster Recovery

RDS automated backups are enabled and a manual snapshot (`ibm-ecommerce-postgres-final-snapshot`) is maintained as recovery evidence. S3 versioning supports recovery of overwritten/deleted object versions.

## Cost Controls

- No NAT Gateway
- S3 Gateway VPC Endpoint
- Small EC2/RDS resources
- ASG maximum capped at 4
- Single-AZ RDS for the Free Tier demo
- Billable resources should be cleaned up after evaluation if a live demo is no longer required

## Current Limitations / Production Improvements

- Public ALB currently serves HTTP because no controlled domain is available for a trusted ACM public certificate. Production should use ACM + HTTPS/443 and redirect HTTP to HTTPS.
- RDS is Single-AZ; production should use RDS Multi-AZ.
- PostgreSQL TLS currently uses `rejectUnauthorized: false`; production should validate the Amazon RDS CA certificate.
- Automatic application rollback is not implemented; production CI/CD should poll refresh health and automatically rollback/redeploy the last known-good artifact.
- For stronger network isolation, production application instances should run in private subnets with appropriate VPC endpoints or controlled egress.
- Rotate DB credentials and scrub/rebuild historical AMIs if an obsolete secret was ever baked into an image.

## Repository Security

Never commit database passwords, AWS access keys, private keys, `.env`, or `/etc/ecommerce.env`.
