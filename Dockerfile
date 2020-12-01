FROM nginxinc/nginx-unprivileged:1.18

# openshift uses arbitrary UIDS to execute pods
# this does not work with the default-nginx, hence the unpriviliged version is used

# see:
# https://github.com/nginxinc/docker-nginx-unprivileged
# https://torstenwalter.de/openshift/nginx/2017/08/04/nginx-on-openshift.html
# https://www.openshift.com/blog/a-guide-to-openshift-and-uids
COPY dist /usr/share/nginx/html
