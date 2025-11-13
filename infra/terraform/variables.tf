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

variable "lambda_package_path" {
  type        = string
  description = "Pfad zum gezippten Lambda-Paket"
}

variable "app_callback_url" {
  type        = string
  description = "Callback-URL des SPAs (z. B. https://app.example.com/login/callback)"
}

variable "app_logout_url" {
  type        = string
  description = "Logout-URL des SPAs"
}
