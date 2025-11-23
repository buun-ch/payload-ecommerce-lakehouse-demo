# Payload Ecommerce Lakehouse Demo Helm Chart

Helm chart for deploying the Payload CMS ecommerce application with lakehouse integration.

## Installation

```bash
# Install with default values
helm install my-app ./charts/payload-ecommerce-lakehouse-demo

# Install with custom values file
helm install my-app ./charts/payload-ecommerce-lakehouse-demo -f values-prod.yaml

# Upgrade existing release
helm upgrade my-app ./charts/payload-ecommerce-lakehouse-demo -f values-prod.yaml
```

## Environment Variables Configuration

This chart supports multiple ways to configure environment variables, allowing flexibility for different deployment scenarios.

### Method 1: Direct Environment Variables (`env`)

Define environment variables directly with key-value pairs:

```yaml
env:
  - name: NODE_ENV
    value: "production"
  - name: NEXT_PUBLIC_SERVER_URL
    value: "https://ecommerce.example.com"
```

### Method 2: Extra Environment Variables (`extraEnvVars`)

Additional environment variables that can be easily added without modifying the main `env` array:

```yaml
extraEnvVars:
  - name: CUSTOM_FEATURE_FLAG
    value: "enabled"
  - name: DEBUG_MODE
    value: "false"
```

### Method 3: From Kubernetes Secret (`extraEnvVarsSecret`)

**Recommended for sensitive data like API keys and credentials.**

All keys from the specified Secret will be exposed as environment variables:

```yaml
extraEnvVarsSecret: "payload-ai-secrets"
```

**Create the Secret:**

```bash
kubectl create secret generic payload-ai-secrets \
  --from-literal=ANTHROPIC_API_KEY="sk-ant-..." \
  --from-literal=LANGFUSE_PUBLIC_KEY="pk-lf-..." \
  --from-literal=LANGFUSE_SECRET_KEY="sk-lf-..." \
  --from-literal=PAYLOAD_SECRET="your-payload-secret" \
  --from-literal=STRIPE_SECRET_KEY="sk_..." \
  --from-literal=STRIPE_WEBHOOKS_SIGNING_SECRET="whsec_..." \
  -n your-namespace
```

**Or from a file:**

```bash
# Create .env file with secrets
cat > secrets.env <<EOF
ANTHROPIC_API_KEY=sk-ant-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
PAYLOAD_SECRET=your-payload-secret
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOKS_SIGNING_SECRET=whsec_...
EOF

kubectl create secret generic payload-ai-secrets \
  --from-env-file=secrets.env \
  -n your-namespace

# Clean up
rm secrets.env
```

### Method 4: From ConfigMap (`extraEnvVarsCM`)

For non-sensitive configuration:

```yaml
extraEnvVarsCM: "payload-config"
```

**Create the ConfigMap:**

```bash
kubectl create configmap payload-config \
  --from-literal=LANGFUSE_BASEURL="https://langfuse.example.com" \
  --from-literal=TRINO_SERVER="trino.example.com:8080" \
  --from-literal=ICEBERG_CATALOG="iceberg" \
  -n your-namespace
```

### Method 5: From Multiple Sources (`envFrom`)

Load all keys from multiple ConfigMaps or Secrets:

```yaml
envFrom:
  - configMapRef:
      name: app-config
  - secretRef:
      name: app-secrets
```

## Complete Example: LLM Integration Setup

Here's a complete example for setting up the AI Business Analyst feature:

### 1. Create Kubernetes Secret for Sensitive Data

```bash
kubectl create secret generic payload-ai-secrets \
  --from-literal=ANTHROPIC_API_KEY="sk-ant-api03-..." \
  --from-literal=LANGFUSE_PUBLIC_KEY="pk-lf-..." \
  --from-literal=LANGFUSE_SECRET_KEY="sk-lf-..." \
  --from-literal=PAYLOAD_SECRET="your-payload-secret-key" \
  --from-literal=DATABASE_URI="postgresql://user:pass@host:5432/db" \
  --from-literal=STRIPE_SECRET_KEY="sk_live_..." \
  --from-literal=STRIPE_WEBHOOKS_SIGNING_SECRET="whsec_..." \
  --from-literal=NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..." \
  -n production
```

### 2. Create ConfigMap for Non-Sensitive Configuration

```bash
kubectl create configmap payload-ai-config \
  --from-literal=LANGFUSE_BASEURL="https://langfuse.example.com" \
  --from-literal=TRINO_SERVER="trino-coordinator.analytics:8080" \
  --from-literal=TRINO_USER="trino" \
  --from-literal=ICEBERG_CATALOG="iceberg" \
  --from-literal=NEXT_PUBLIC_SERVER_URL="https://ecommerce.example.com" \
  -n production
```

### 3. Configure Helm Values

**values-production.yaml:**

```yaml
replicaCount: 3

image:
  imageRegistry: ghcr.io/your-org
  repository: payload-ecommerce-lakehouse-demo
  tag: "v1.0.0"
  pullPolicy: IfNotPresent

# Reference the secrets and configmaps
extraEnvVarsSecret: "payload-ai-secrets"
extraEnvVarsCM: "payload-ai-config"

# Additional environment variables
extraEnvVars:
  - name: NODE_ENV
    value: "production"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: ecommerce.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: ecommerce-tls
      hosts:
        - ecommerce.example.com

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

### 4. Deploy

```bash
helm upgrade --install payload-app \
  ./charts/payload-ecommerce-lakehouse-demo \
  -f values-production.yaml \
  -n production
```

## Environment Variables Priority

Environment variables are applied in the following order (later overrides earlier):

1. `env` - Base environment variables
2. Built-in variables (NEXT_TELEMETRY_DISABLED, etc.)
3. `extraEnvVars` - Additional key-value pairs
4. `envFrom` - From ConfigMaps/Secrets (whole resources)
5. `extraEnvVarsCM` - From specific ConfigMap
6. `extraEnvVarsSecret` - From specific Secret

## Required Environment Variables

For the LLM integration feature, the following variables are required:

### Essential (must be in Secret)

- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `PAYLOAD_SECRET` - Payload CMS secret key
- `DATABASE_URI` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOKS_SIGNING_SECRET` - Stripe webhook secret

### LLM Features (can be in Secret)

- `LANGFUSE_PUBLIC_KEY` - Langfuse public key
- `LANGFUSE_SECRET_KEY` - Langfuse secret key

### Non-Sensitive (can be in ConfigMap)

- `LANGFUSE_BASEURL` - Langfuse instance URL (default: https://langfuse.buun.dev)
- `NEXT_PUBLIC_SERVER_URL` - Public URL of the application
- `TRINO_SERVER` - Trino server address
- `TRINO_USER` - Trino username
- `ICEBERG_CATALOG` - Iceberg catalog name

### Optional

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (can be public)
- `NODE_ENV` - Node environment (production/development)

## Security Best Practices

1. **Never commit secrets to Git**
   - Use `kubectl create secret` or external secret management tools
   - Add `*secrets*.yaml` to `.gitignore`

2. **Use External Secret Management** (recommended for production)
   ```yaml
   # Using External Secrets Operator
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: payload-ai-secrets
   spec:
     secretStoreRef:
       name: aws-secretsmanager
       kind: SecretStore
     target:
       name: payload-ai-secrets
     data:
       - secretKey: ANTHROPIC_API_KEY
         remoteRef:
           key: prod/payload/anthropic-api-key
   ```

3. **Use RBAC** to restrict access to secrets
   ```yaml
   apiVersion: rbac.authorization.k8s.io/v1
   kind: Role
   metadata:
     name: secret-reader
   rules:
   - apiGroups: [""]
     resources: ["secrets"]
     resourceNames: ["payload-ai-secrets"]
     verbs: ["get"]
   ```

4. **Enable Secret Encryption at Rest**
   - Ensure Kubernetes secret encryption is enabled in your cluster

5. **Rotate Secrets Regularly**
   ```bash
   # Update secret
   kubectl create secret generic payload-ai-secrets \
     --from-literal=ANTHROPIC_API_KEY="new-key" \
     --dry-run=client -o yaml | kubectl apply -f -

   # Restart pods to pick up new secret
   kubectl rollout restart deployment/my-app
   ```

## Verification

After deployment, verify environment variables are correctly loaded:

```bash
# Check pod environment variables (sanitized view)
kubectl exec -it deployment/my-app -- env | grep -E "LANGFUSE|ANTHROPIC|TRINO" | sed 's/=.*/=***/'

# Expected output:
# LANGFUSE_BASEURL=***
# ANTHROPIC_API_KEY=***
# TRINO_SERVER=***
```

## Troubleshooting

### Secret Not Found

```
Error: couldn't find key ANTHROPIC_API_KEY in Secret default/payload-ai-secrets
```

**Solution:** Ensure the secret exists and contains the required keys:

```bash
kubectl get secret payload-ai-secrets -o jsonpath='{.data}' | jq 'keys'
```

### Environment Variable Not Available

**Check the pod's environment:**

```bash
kubectl exec -it <pod-name> -- printenv | grep ANTHROPIC_API_KEY
```

If missing, verify:
1. Secret/ConfigMap exists in the same namespace
2. Helm values are correctly set
3. Pod has been restarted after secret creation

### Application Can't Connect to Services

Verify network connectivity:

```bash
# From inside the pod
kubectl exec -it <pod-name> -- sh
curl -v https://langfuse.buun.dev
curl -v http://trino-coordinator.analytics:8080
```

## Migration from .env.local

If you're migrating from local development with `.env.local`:

1. **Identify sensitive vs. non-sensitive variables**
   ```bash
   # Separate into two files
   grep -E "KEY|SECRET|PASSWORD|URI" .env.local > secrets.env
   grep -vE "KEY|SECRET|PASSWORD|URI" .env.local > config.env
   ```

2. **Create Kubernetes resources**
   ```bash
   kubectl create secret generic payload-ai-secrets --from-env-file=secrets.env
   kubectl create configmap payload-ai-config --from-env-file=config.env
   ```

3. **Update values.yaml**
   ```yaml
   extraEnvVarsSecret: "payload-ai-secrets"
   extraEnvVarsCM: "payload-ai-config"
   ```

4. **Clean up local files**
   ```bash
   rm secrets.env config.env
   ```

## Additional Resources

- [Kubernetes Secrets Documentation](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes ConfigMaps Documentation](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Helm Values Files](https://helm.sh/docs/chart_template_guide/values_files/)
- [External Secrets Operator](https://external-secrets.io/)
