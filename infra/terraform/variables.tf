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
  description = "Root-Domain in Route 53 (z. B. leitnersoft.de)"
  default     = "leitnersoft.de"
}

variable "app_subdomain" {
  type        = string
  description = "Subdomain für das Frontend (z. B. habify)"
  default     = "habify"
}

variable "app_callback_url" {
  type        = string
  description = "Callback-URL des SPAs (z. B. https://app.example.com/login/callback)"
}

variable "app_logout_url" {
  type        = string
  description = "Logout-URL des SPAs"
}
