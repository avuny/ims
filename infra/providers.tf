# ==============================================================================
# PROVIDERS
# ==============================================================================
# This file tells Terraform exactly which cloud provider (AWS) 
# we are interacting with, and locks down the version of the provider plugin.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.app_name
      ManagedBy   = "Terraform"
      Environment = "Production"
    }
  }
}
provider "github" {
  owner = "khni"
}
