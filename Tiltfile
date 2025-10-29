# -*- mode: Python -*-
# https://docs.tilt.dev/

allow_k8s_contexts(k8s_context())

config.define_string('registry')
config.define_bool('port-forward')
config.define_string('extra-values-file')
config.define_bool('enable-health-logs')

cfg = config.parse()

registry = cfg.get('registry', 'localhost:30500')
default_registry(registry)

docker_build(
    'payload-ecommerce-lakehouse-demo-dev',
    '.',
    dockerfile='Dockerfile.dev',
    live_update=[
        sync('.', '/app'),
        run('pnpm install', trigger=['./package.json', './pnpm-lock.yaml']),
    ]
)

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
