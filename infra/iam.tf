# ==============================================================================
# GITHUB OIDC PROVIDER
# ==============================================================================
#  This registers GitHub as a trusted Identity Provider (IdP) in AWS.
# It acts as the bridge that allows GitHub to request short-lived credentials.

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # These are GitHub's official TLS thumbprints for their OIDC tokens.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]
}

# ==============================================================================
# IAM ROLE FOR GITHUB ACTIONS
# ==============================================================================
#  GitHub Actions will temporarily "assume" this role to deploy.
# We apply a strict condition so that ONLY specific repository and branch 
# are allowed to assume the role.

resource "aws_iam_role" "github_actions" {
  name = "${var.app_name}-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # SECURITY BOUNDARY: Ensures ONLY the 'main' branch of this exact repository can deploy.
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

# ==============================================================================
# IAM POLICY (PERMISSIONS FOR THE ROLE)
# ==============================================================================
#  We grant the absolute minimum permissions (Least Privilege).
# This role can only sync to specific S3 bucket and invalidate specific CDN.

resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "${var.app_name}-deploy-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3Sync"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        # We safely reference the exact bucket ARN created in s3.tf
        Resource = [
          aws_s3_bucket.web_app.arn,
          "${aws_s3_bucket.web_app.arn}/*"
        ]
      },
      {
        Sid    = "AllowCloudFrontInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        # We safely reference the exact distribution ARN created in cloudfront.tf
        Resource = [
          aws_cloudfront_distribution.web_app.arn
        ]
      }
    ]
  })
}
