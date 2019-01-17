// The GIT repository for this pipeline lib is defined in the global Jenkins setting
@Library('jenkins-pipeline-library')
import com.gentics.*

// Make the helpers aware of this jobs environment
JobContext.set(this)

final def dockerRegistry       = "gentics-docker-jenkinsbuilds.docker.apa-it.at"
final def dockerImageName      = dockerRegistry + "/gentics/jenkinsbuilds/mesh-slave-ui"

properties([
	parameters([
		booleanParam(name: 'release', defaultValue: false, description: "Whether to run the release steps.")
	])
])

final def gitCommitTag = '[Jenkins | ' + env.JOB_BASE_NAME + ']'
def version = null

node("docker") {
	stage("Setup Build Environment") {
		checkout scm
		
		withDockerRegistry([ credentialsId: "repo.gentics.com", url: "https://" + dockerRegistry + "/v2" ]) {
			sh "docker pull " + dockerImageName + " || true"
			sh "cd .jenkins && docker build -t " + dockerImageName + " ."
			sh "cd .jenkins && docker push " + dockerImageName
		}
		
		podTemplate(containers: [
			containerTemplate(alwaysPullImage: true,
				command: 'cat',
				image: dockerImageName,
				name: 'nodejs',
				privileged: false,
				ttyEnabled: true,
				resourceRequestCpu: '1000m',
				resourceRequestMemory: '1048Mi'
				)],
				label: 'mesh-ui',
				name: 'jenkins-slave-mesh-ui',
				namespace: 'default', 
				nodeSelector: 'jenkins_mesh_worker=true',
				serviceAccount: 'jenkins',
				imagePullSecrets: ['docker-jenkinsbuilds-apa-it'],
				volumes: [
					emptyDirVolume(memory: false, mountPath: '/var/run'),
					hostPathVolume(hostPath: '/opt/jenkins-slave/maven-repo', mountPath: '/ci/.m2/repository'),
					persistentVolumeClaim(claimName: 'jenkins-credentials', mountPath: '/ci/credentials', readOnly: true)
				], 
				workspaceVolume: emptyDirWorkspaceVolume(false)) {
					node("mesh-ui") {
						sshagent(["git"]) {
							stage("Checkout") {
								checkout scm
								echo "Building " + env.BRANCH_NAME
							}

							stage("Install dependencies") {
								container('nodejs') {
									sh "/usr/local/bin/npm install --global yarn"
									sh "/usr/local/bin/yarn"
									echo "Preparing basepath"
									sh '''sed -i 's/href="\\(.*\\)\\"/href=\\"\\/ui\\"/' src/index.html'''
								}
							}

							stage("Set version") {
								if (params.release) {
									def buildVars = readJSON file: 'package.json'
									version = buildVars.version
									sh "./mvnw versions:set -DgenerateBackupPoms=false -DnewVersion=" + version
								} else {
									echo "Not setting version"
								}
							}

							stage("Build") {
							    container('nodejs') {
			    					//try {
		    							sh "until /usr/local/bin/yarn build ; do echo retry.. ; sleep 1 ; done"
	    							//} finally {
    								//step([$class: 'JUnitResultArchiver', testResults: 'dist/junit.xml'])
								    //}
							    }
							}

							stage("Deploy") {
								if (params.release) {
									GitHelper.addCommit('.', gitCommitTag + ' Release version ' + version)
									GitHelper.addTag(version, 'Release version ' + version)
									sh "./mvnw deploy"
									GitHelper.pushTag(version)
									GitHelper.pushBranch(GitHelper.fetchCurrentBranchName())
								}
							}
						}
					}
				}
	}
}
