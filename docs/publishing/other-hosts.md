# AWS and other static hosts

Any platform that serves a directory of static files can host an OWB site. It
must preserve nested `index.html` files so `/about/` serves
`dist-publish/about/index.html`.

## AWS Amplify Hosting

AWS recommends Amplify Hosting for a managed CDN and HTTPS workflow backed by
Git or S3. Connect the repository and use:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run publish
  artifacts:
    baseDirectory: dist-publish
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
```

Save this as `amplify.yml` or enter equivalent settings in the Amplify console.

## Amazon S3 and CloudFront

Publish and synchronize the generated output:

```bash
npm ci
npm run publish
aws s3 sync dist-publish/ s3://my-website-bucket/ --delete
```

For production, place CloudFront in front of a private S3 bucket using Origin
Access Control. Configure the default root object as `index.html`, HTTPS, and a
custom domain certificate. S3 website endpoints alone do not provide the same
managed HTTPS and private-origin setup.

Nested routes may require a CloudFront Function or error-response rule that
maps extensionless requests to their directory `index.html`. Test `/about` and
`/about/` before launch.

## Conventional server or object storage

Upload the contents of `dist-publish/` to the web root:

```bash
rsync -av --delete dist-publish/ deploy@example.com:/var/www/example.com/
```

Configure the server to use `index.html` as the directory index. Nginx, Apache,
Caddy, object-storage CDNs, and similar services work when they preserve the
generated paths and serve the site at the origin root.

## Container image

A minimal static container can use Nginx:

```dockerfile
FROM node:22.13-alpine AS build
WORKDIR /site
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run publish

FROM nginx:alpine
COPY --from=build /site/dist-publish /usr/share/nginx/html
```

This image serves the public site only. It does not include the editor backend.

See [AWS static website hosting guidance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html).
