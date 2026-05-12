pipeline {
    agent any
    
    environment {
        CI = 'true'
        NODE_ENV = 'ci'
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Repository checked out successfully"
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo "Installing Node dependencies..."
                bat 'npm install'
            }
        }
        
        stage('Install Browsers') {
            steps {
                echo "Installing Playwright browsers..."
                bat 'npx playwright install'
            }
        }
        
        stage('Run Tests') {
            steps {
                echo "Running Playwright tests..."
                bat 'npm run test:report'
            }
        }
        
        stage('Generate Dashboard') {
            steps {
                echo "Generating test dashboard..."
                bat 'node scripts/generate-report.js'
            }
        }
        
        stage('Archive Artifacts') {
            steps {
                echo "Archiving test reports and artifacts..."
                archiveArtifacts artifacts: 'dashboard/public/**/*,test-results/**/*', 
                                 allowEmptyArchive: true
            }
        }
        
        stage('Publish Reports') {
            steps {
                echo "Publishing test results..."
                publishHTML([
                    reportDir: 'dashboard/public/playwright-report',
                    reportFiles: 'index.html',
                    reportName: 'Playwright Test Report',
                    keepAll: true,
                    alwaysLinkToLastBuild: true
                ])
                
                publishHTML([
                    reportDir: 'dashboard/public',
                    reportFiles: 'index.html',
                    reportName: 'Test Dashboard',
                    keepAll: true,
                    alwaysLinkToLastBuild: true
                ])
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo "Deploying to production..."
                withCredentials([string(credentialsId: 'netlify-token', variable: 'NETLIFY_AUTH_TOKEN')]) {
                    bat 'npm run deploy:netlify'
                }
            }
        }
    }
    
    post {
        always {
            echo "Pipeline execution completed"
            cleanWs(deleteDirs: true, patterns: [[pattern: 'node_modules/**', type: 'INCLUDE']])
        }
        failure {
            echo "❌ Build failed - Check test reports for details"
        }
        success {
            echo "✅ Build successful"
        }
    }
}
