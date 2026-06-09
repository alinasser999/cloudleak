output "alb_dns_name" {
  description = "ALB DNS name — point your CNAME here"
  value       = aws_lb.web.dns_name
}

output "ecr_web_url" {
  description = "ECR repository URL for the web image"
  value       = aws_ecr_repository.web.repository_url
}

output "ecr_worker_url" {
  description = "ECR repository URL for the worker image"
  value       = aws_ecr_repository.worker.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name (used in deploy workflow)"
  value       = aws_ecs_cluster.main.name
}
