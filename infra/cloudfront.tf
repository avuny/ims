# ==============================================================================
# CLOUDFRONT ORIGIN ACCESS CONTROL (OAC)
# ==============================================================================

resource "aws_cloudfront_origin_access_control" "web_app" {
  name                              = "${var.app_name}-oac"
  description                       = "OAC for ${var.app_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ==============================================================================
# CLOUDFRONT DISTRIBUTION (CONTENT DELIVERY NETWORK)
# ==============================================================================

resource "aws_cloudfront_distribution" "web_app" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.web_app.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.web_app.id
    origin_id                = "S3-${aws_s3_bucket.web_app.bucket}"
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.web_app.bucket}"
    viewer_protocol_policy = "redirect-to-https"

    # AWS Managed CachingOptimized policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA ROUTING FALLBACKS (CRITICAL FOR REACT, VUE, ANGULAR)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
