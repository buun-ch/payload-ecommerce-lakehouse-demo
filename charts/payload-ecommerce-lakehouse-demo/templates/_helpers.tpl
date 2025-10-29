{{/*
Expand the name of the chart.
*/}}
{{- define "payload-ecommerce-lakehouse-demo.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "payload-ecommerce-lakehouse-demo.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "payload-ecommerce-lakehouse-demo.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "payload-ecommerce-lakehouse-demo.labels" -}}
helm.sh/chart: {{ include "payload-ecommerce-lakehouse-demo.chart" . }}
{{ include "payload-ecommerce-lakehouse-demo.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "payload-ecommerce-lakehouse-demo.selectorLabels" -}}
app.kubernetes.io/name: {{ include "payload-ecommerce-lakehouse-demo.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "payload-ecommerce-lakehouse-demo.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "payload-ecommerce-lakehouse-demo.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper image name
*/}}
{{- define "payload-ecommerce-lakehouse-demo.image" -}}
{{- $registryName := .Values.image.imageRegistry -}}
{{- $repositoryName := .Values.image.repository -}}
{{- $separator := ":" -}}
{{- $termination := .Values.image.tag | default .Chart.AppVersion | toString -}}
{{- if $registryName }}
    {{- printf "%s/%s%s%s" $registryName $repositoryName $separator $termination -}}
{{- else }}
    {{- printf "%s%s%s" $repositoryName $separator $termination -}}
{{- end }}
{{- end }}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "payload-ecommerce-lakehouse-demo.imagePullSecrets" -}}
{{- if .Values.global }}
    {{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
        {{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
        {{- end }}
    {{- else if .Values.imagePullSecrets }}
imagePullSecrets:
        {{- range .Values.imagePullSecrets }}
  - name: {{ . }}
        {{- end }}
    {{- end }}
{{- else if .Values.imagePullSecrets }}
imagePullSecrets:
    {{- range .Values.imagePullSecrets }}
  - name: {{ . }}
    {{- end }}
{{- end }}
{{- end }}

{{/*
Process init containers and set image if needed
*/}}
{{- define "payload-ecommerce-lakehouse-demo.initContainers" -}}
{{- range .Values.initContainers }}
- name: {{ .name }}
  {{- if not .image }}
  image: {{ include "payload-ecommerce-lakehouse-demo.image" $ }}
  {{- else }}
  image: {{ .image }}
  {{- end }}
  {{- if .command }}
  command: {{ toJson .command }}
  {{- end }}
  {{- if .args }}
  args: {{ toJson .args }}
  {{- end }}
  {{- if .env }}
  env:
    {{- toYaml .env | nindent 4 }}
  {{- end }}
  {{- if .volumeMounts }}
  volumeMounts:
    {{- toYaml .volumeMounts | nindent 4 }}
  {{- end }}
  {{- if .workingDir }}
  workingDir: {{ .workingDir }}
  {{- end }}
{{- end }}
{{- end }}
