variable "aws_region" {
  type        = string
  description = "AWS Region für die Bereitstellung"
  default     = "eu-central-1"
}

variable "environment" {
  type        = string
  description = "Umgebungsname, z. B. dev oder prod"
  default     = "dev"
}

variable "root_domain" {
  type        = string
  description = "Root-Domain in Route 53 (z. B. leitnersoft.com)"
  default     = "leitnersoft.com"
}

variable "app_subdomain" {
  type        = string
  description = "Subdomain für das Frontend (z. B. habify)"
  default     = "habify"
}

