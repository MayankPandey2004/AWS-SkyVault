package utils

import (
	"bytes"
	"io"
	"log"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

var (
	sess       *session.Session
	bucketName string
)

// InitAWS initializes the AWS session after env vars are loaded
func InitAWS() {
	bucketName = os.Getenv("S3_BUCKET")
	region := os.Getenv("AWS_REGION")

	if bucketName == "" || region == "" {
		log.Fatalf("❌ Missing AWS env vars: S3_BUCKET=%s AWS_REGION=%s", bucketName, region)
	}

	sess = session.Must(session.NewSession(&aws.Config{
		Region: aws.String(region),
	}))

	log.Printf("✅ AWS initialized: bucket=%s, region=%s", bucketName, region)
}

// UploadToS3 uploads a file stream to S3 and updates DB stats
func UploadToS3(file io.Reader, key string) error {
	svc := s3.New(sess)

	buf := new(bytes.Buffer)
	_, err := io.Copy(buf, file)
	if err != nil {
		return err
	}

	_, err = svc.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
		Body:   bytes.NewReader(buf.Bytes()),
	})

	return nil
}

// ListFiles lists all objects for a given prefix (e.g. "username/")
func ListFiles(prefix string) ([]map[string]interface{}, error) {
	svc := s3.New(sess)
	resp, err := svc.ListObjectsV2(&s3.ListObjectsV2Input{
		Bucket: aws.String(bucketName),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		return nil, err
	}

	files := []map[string]interface{}{}
	for _, item := range resp.Contents {
		files = append(files, map[string]interface{}{
			"key":          *item.Key,
			"size":         *item.Size,
			"lastModified": item.LastModified,
		})
	}
	return files, nil
}

// DownloadFromS3 downloads a file by key and updates DB stats
func DownloadFromS3(key string) (io.ReadCloser, error) {
	svc := s3.New(sess)
	resp, err := svc.GetObject(&s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	return resp.Body, nil
}

// DeleteFromS3 deletes a file by key and updates DB stats
func DeleteFromS3(key string) error {
	svc := s3.New(sess)
	_, err := svc.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		return err
	}

	return nil
}
