# ==============================================================================
# VARIABLES
# ==============================================================================
# Variables make your Terraform code reusable. Instead of hardcoding 
# the bucket name or app name in multiple places, we define them once here. 

variable "app_name" {
  description = "The name of the application, used as a prefix for naming resources."
  type        = string
  default     = "ims-app"
}

variable "bucket_name" {
  description = "The globally unique name for the S3 bucket."
  type        = string
  default     = "ims-web-app-bucket"
}

variable "aws_region" {
  description = "The AWS region where resources will be deployed."
  type        = string
  default     = "us-east-1"
}

# Added for the IAM Role Trust Policy
variable "github_repository" {
  description = "The GitHub organization/user and repository name (e.g. 'avuny/ims')"
  type        = string

  default = "avuny/ims"
}

variable "github_owner" {
  description = "The GitHub user that owns the repository."
  type        = string
  default     = "avuny"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "container_port" {
  description = "Application container exposure port"
  type        = number
  default     = 4000
}