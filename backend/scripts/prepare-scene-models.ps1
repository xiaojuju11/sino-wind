param([string]$Proxy = '')
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '../models/scene'
$models = @(
  @{Name='segmenter-b1'; Repo='Xenova/segformer-b1-finetuned-ade-512-512'; Revision='6308717ce1fc0f39dd847e3b2e98edebc4ace4a0'},
  @{Name='depth'; Repo='onnx-community/depth-anything-v2-small'; Revision='4472b7362082ad9968fee890ca0f1e5aca36b93d'}
)
foreach ($model in $models) {
  $folder = Join-Path $root $model.Name
  New-Item -ItemType Directory -Force (Join-Path $folder 'onnx') | Out-Null
  foreach ($file in @('config.json','preprocessor_config.json','README.md','onnx/model_quantized.onnx')) {
    $target = Join-Path $folder $file
    $download = "$target.download"
    $url = "https://huggingface.co/$($model.Repo)/resolve/$($model.Revision)/$file"
    $arguments = @('--fail','--location','--retry','2','--connect-timeout','30','--max-time','600','--output',$download,$url)
    if ($Proxy) { $arguments = @('--proxy',$Proxy) + $arguments }
    & curl.exe @arguments
    if ($LASTEXITCODE -ne 0) { throw "Download failed: $($model.Name)/$file" }
    Move-Item -LiteralPath $download -Destination $target -Force
  }
  Write-Output "Ready: $($model.Name) ($($model.Revision))"
}
