variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name prefix for all resources"
  type        = string
  default     = "cloudleak"
}

variable "vpc_id" {
  description = "VPC ID to deploy ECS services into"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS on the ALB"
  type        = string
}

variable "web_env_vars" {
  description = "Environment variables injected into the web task. Sensitive vars go in Secrets Manager."
  type        = map(string)
  default     = {}
}

variable "worker_env_vars" {
  description = "Environment variables injected into the worker task."
  type        = map(string)
  default     = {}
}

variable "web_cpu" {
  type    = number
  default = 512
}

variable "web_memory" {
  type    = number
  default = 1024
}

variable "worker_cpu" {
  type    = number
  default = 256
}

variable "worker_memory" {
  type    = number
  default = 512
}
