# ==============================================================================
# S3 BUCKET (STORAGE)
# ==============================================================================
# This bucket stores your compiled frontend files (HTML, CSS, JS).

resource "aws_s3_bucket" "web_app" {
  bucket = var.bucket_name

  # NOTICE: We DO NOT enable static website hosting here (no `website` block).
  # We enforce complete privacy so traffic must route through CloudFront.
}

# ==============================================================================
# S3 PUBLIC ACCESS BLOCK (SECURITY)
# ==============================================================================

resource "aws_s3_bucket_public_access_block" "web_app" {
  bucket                  = aws_s3_bucket.web_app.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ==============================================================================
# S3 BUCKET POLICY (GRANTING CLOUDFRONT ACCESS)
# ==============================================================================
# Since the bucket is private, we use this policy to grant read 
# permission ONLY to our specific CloudFront distribution via Origin Access Control.

data "aws_iam_policy_document" "s3_oac_policy" {
  statement {
    sid       = "AllowCloudFrontServicePrincipal"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.web_app.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.web_app.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "web_app" {
  bucket = aws_s3_bucket.web_app.id
  policy = data.aws_iam_policy_document.s3_oac_policy.json
}
