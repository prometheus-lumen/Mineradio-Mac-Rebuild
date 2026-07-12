<h1 align=center>ncmapi-rs</h1>

NetEase Cloud Music API for Rust.


### Usage

```toml
[dependencies]
ncmapi = "0.1"
tokio = { version = "1", features = ["full"] }
```

```rust
use ncmapi::NcmApi;

#[tokio::main]
async fn main() -> std::result::Result<(), Box<dyn std::error:Error>> {
    let api = NcmApi::default();
    let resp = api.cloud_search("mota", None).await;

    let res = resp.unwrap().deserialize_to_implict();
    println!("{:#?}", res);

    Ok(())
}
```


### Document

Most of the functions are self documented. If there is some confusion about the params of a funtion requires, figure out [here](https://neteasecloudmusicapi.vercel.app)



### How it works

* api: export api functions.
* client:
    * takes an ApiRequst, process it into a Request by presenting it with header and encrypt the payload etc. And then send requests to the server, takes the response and then returns the ApiResponse back.
    * cache

### Status

```rust
// failures:
    // 专辑订阅
    api::tests::test_album_sub,
    api::tests::test_album_sublist, types::tests::test_de_artist_sublist,

    // 艺术家订阅
    api::tests::test_artist_sub,
    api::tests::test_artist_sublist,

    // 发布评论
    api::tests::test_comment_create,

    // 每日签到
    api::tests::test_daily_signin,

    // FM 垃圾
    api::tests::test_fm_trash,

    // 收藏/收藏列表
    api::tests::test_like,
    api::tests::test_likelist,

    // 手机号登录，刷新登录
    api::tests::test_login_phone,
    api::tests::test_login_refresh,

    // 推荐播放列表，推荐歌曲
    api::tests::test_recommend_resource, types::tests::test_de_recommended_playlists,
    api::tests::test_recommend_songs, types::tests::test_de_recommended_songs,

    // 用户相关
    api::tests::test_user_cloud, types::tests::test_de_user_cloud,
    api::tests::test_user_level,
    api::tests::test_user_record,
    api::tests::test_user_subcount,
```

### Contribute

If you think this package useful, please do make pull requests.

### License

[MIT](LICENSE)