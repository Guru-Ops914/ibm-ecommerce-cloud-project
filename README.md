# IBM E-Commerce Cloud Project

Highly Available Cloud-Native E-Commerce Platform implemented on AWS.

## Architecture

User → Application Load Balancer → Target Group → EC2 Node.js application → Amazon RDS PostgreSQL

The application tier uses an Auto Scaling Group across two Availability Zones. Amazon S3 provides private encrypted object storage, while CloudWatch and SNS provide monitoring and alerting.

## Implemented Components

- Custom VPC with public/private subnet segmentation across two Availability Zones
- Application Load Balancer with `/health` target health checks
- Node.js/Express application on EC2
- Auto Scaling Group: minimum 2, desired 2, maximum 4
- CPU target-tracking scaling policy at approximately 50%
- Amazon RDS PostgreSQL in private subnets
- Private S3 bucket with encryption and versioning
- IAM role-based AWS access
- Systems Manager Parameter Store SecureString as a secret-management component
- CloudWatch alarms and SNS notifications
- AMI and Launch Template versioning
- Rolling Auto Scaling Instance Refresh
- RDS automated backups and manual recovery snapshot

## Application Endpoints

- `/` — application status
- `/health` — ALB health check
- `/products` — reads products from PostgreSQL

## High Availability and Scaling

The compute/application tier runs across two Availability Zones behind the ALB. The ASG maintains two instances and can scale to four.

A failure test was performed by terminating an ASG instance. The remaining healthy target continued serving traffic while the ASG launched replacement capacity.

During controlled concurrent load testing, CPU increased from roughly 2% to about 36%. The ASG remained at two instances because CPU stayed below the configured 50% target.

## Security

Traffic between tiers is restricted using security groups:

Internet → ALB security group → Application security group → Database security group → RDS

No real database password or AWS access key is stored in this repository. Runtime configuration is represented only by `.env.example`.

## CI Workflow

GitHub Actions validates the Node.js project on pushes and pull requests to `main`. It installs dependencies and performs JavaScript syntax validation.

The AWS deployment process currently uses AMI versions, Launch Template versions, and Auto Scaling Instance Refresh. Direct GitHub-to-AWS automated deployment is not yet claimed as implemented.

## Backup and Disaster Recovery

RDS automated backups are enabled and a manual database snapshot is maintained as recovery evidence. Recovery would restore the snapshot to a new RDS instance, validate it, and update the application database configuration.

S3 versioning supports recovery of overwritten or deleted object versions.

## Current Limitations / Production Improvements

- RDS is currently Single-AZ. Production database HA should use RDS Multi-AZ.
- Parameter Store SecureString exists, but the running application currently receives its DB password through the EC2 environment file. Production should retrieve secrets at runtime.
- The ALB currently serves HTTP. Production should use ACM TLS certificates, HTTPS/443, and redirect HTTP to HTTPS.
- PostgreSQL SSL currently uses `rejectUnauthorized: false`; production should validate the Amazon RDS CA certificate.
- EC2 memory utilization requires CloudWatch Agent and is not currently collected as a default EC2 metric.

## Cost Controls

The implementation avoids a NAT Gateway, uses small EC2/RDS resources, limits ASG maximum capacity, and avoids unnecessary managed services. Billable resources should be stopped or deleted when project demo/evidence is complete.

## Repository Security

Never commit database passwords, AWS access keys, private keys, `.env`, or `/etc/ecommerce.env`.

Deployment verification: Launch Template v4 uses AWS Systems Manager Parameter Store for runtime database secret retrieval.

Monitoring deployment: Launch Template v5 includes CloudWatch Agent memory monitoring with secure Parameter Store secret retrieval.

Deployment retry marker: SSM VPC endpoint connectivity enabled for runtime Parameter Store retrieval.
