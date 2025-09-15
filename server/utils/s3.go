package utils

import (
	"bytes"
	"io"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

var (
	sess       *session.Session
	bucketName string
)

func init() {
	bucketName = os.Getenv("S3_BUCKET")
	region := os.Getenv("AWS_REGION")

	sess = session.Must(session.NewSession(&aws.Config{
		Region: aws.String(region),
	}))
}

// UploadToS3 uploads file to bucket
func UploadToS3(file io.Reader, key string) error {
	uploader := s3.New(sess)

	buf := new(bytes.Buffer)
	_, err := io.Copy(buf, file)
	if err != nil {
		return err
	}

	_, err = uploader.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
		Body:   bytes.NewReader(buf.Bytes()),
	})
	return err
}

// ListFiles returns all files for a prefix
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

// DownloadFromS3 fetches file by key
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

// DeleteFromS3 deletes file by key
func DeleteFromS3(key string) error {
	svc := s3.New(sess)
	_, err := svc.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	})
	return err
}
