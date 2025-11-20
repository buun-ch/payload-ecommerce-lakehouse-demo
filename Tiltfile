# -*- mode: Python -*-
# https://docs.tilt.dev/
#
# Tilt configuration for Payload Ecommerce Lakehouse Demo

allow_k8s_contexts(k8s_context())

config.define_string('registry')
config.define_bool('port-forward')
config.define_string('extra-values-file')
config.define_bool('enable-health-logs')
config.define_bool('ai-assistant')
config.define_bool('metabase-embedding')
config.define_bool('prod-image')

cfg = config.parse()

registry = cfg.get('registry', 'localhost:30500')
default_registry(registry)

use_prod_image = cfg.get('prod-image', False)

if use_prod_image:
    # Production image build (uses experimental build mode)
    docker_build(
        'payload-ecommerce-lakehouse-demo-dev',
        '.',
        dockerfile='Dockerfile',
    )
    print("🏗️  Using production Dockerfile with experimental build mode")
else:
    # Development image build (hot reload enabled)
    docker_build(
        'payload-ecommerce-lakehouse-demo-dev',
        '.',
        dockerfile='Dockerfile.dev',
        live_update=[
            sync('.', '/app'),
            run('pnpm install', trigger=['./package.json', './pnpm-lock.yaml']),
        ]
    )
    print("🔥 Using development Dockerfile with live reload")

values_files = ['./charts/payload-ecommerce-lakehouse-demo/values-dev.yaml']
extra_values_file = cfg.get('extra-values-file', '')
if extra_values_file:
    values_files.append(extra_values_file)
    print("📝 Using extra values file: " + extra_values_file)

helm_set_values = []
enable_health_logs = cfg.get('enable-health-logs', False)
if enable_health_logs:
    helm_set_values.append('logging.health_request=true')
    print("📵 Health check request logs enabled")

ai_assistant = cfg.get('ai-assistant', False)
if ai_assistant:
    k8s_yaml('./manifests/ai-env-external-secret.yaml')
    helm_set_values.append('extraEnvVarsSecret=ai-env-secret')
    helm_set_values.append('aiAssistant.enabled=true')
    print("🤖 AI External Secret enabled (ai-env-secret)")

metabase_embedding = cfg.get('metabase-embedding', False)
if metabase_embedding:
    k8s_yaml('./manifests/metabase-embedding-external-secret.yaml')
    helm_set_values.append('metabase.embedding.enabled=true')
    helm_set_values.append('metabase.embedding.envVarsSecret=metabase-embedding-secret')
    print("📊 Metabase embedding enabled")

helm_release = helm(
    './charts/payload-ecommerce-lakehouse-demo',
    name='payload-ecommerce-lakehouse-demo',
    values=values_files,
    set=helm_set_values,
)
k8s_yaml(helm_release)

enable_port_forwards = cfg.get('port-forward', False)
k8s_resource(
    'payload-ecommerce-lakehouse-demo',
    port_forwards='13000:3000' if enable_port_forwards else [],
)

if enable_port_forwards:
    print("🚀 Access your application at: http://localhost:13000")
